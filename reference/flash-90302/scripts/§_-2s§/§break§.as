package §_-2s§
{
   import Playtomic.Link;
   import bobby.§_-07§;
   import bobby.§_-0v§;
   import flash.display.SimpleButton;
   import flash.events.Event;
   import flash.events.MouseEvent;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol473")]
   public class §break§ extends §_-07§
   {
      
      public var §_-O§:SimpleButton;
      
      public var §_-02§:SimpleButton;
      
      public var §_-0f§:SimpleButton;
      
      public var backBtn:SimpleButton;
      
      public function §break§()
      {
         super();
      }
      
      override public function handleStageAdd(param1:Event) : void
      {
         super.handleStageAdd(param1);
         SimpleButton(this.backBtn).addEventListener(MouseEvent.MOUSE_UP,this.§_-0§);
         SimpleButton(this.§_-O§).addEventListener(MouseEvent.MOUSE_UP,this.§_-Y§);
         SimpleButton(this.§_-0f§).addEventListener(MouseEvent.MOUSE_UP,this.§_-50§);
         SimpleButton(this.§_-02§).addEventListener(MouseEvent.MOUSE_UP,this.§with§);
      }
      
      private function §_-Y§(param1:MouseEvent) : void
      {
         Link.Open(§_-0v§.§else§,"CreditsDev","EffingLinks");
      }
      
      private function §_-50§(param1:MouseEvent) : void
      {
         Link.Open(§_-0v§.§else§,"CreditsCode","EffingLinks");
      }
      
      private function §with§(param1:MouseEvent) : void
      {
         Link.Open("http://www.hybridwing.com/","CreditsArt","EffingLinks");
      }
      
      override public function handleEnterFrame(param1:Number) : void
      {
         super.handleEnterFrame(param1);
      }
      
      override public function handleRemove(param1:Event) : void
      {
         super.handleRemove(param1);
         SimpleButton(this.backBtn).removeEventListener(MouseEvent.MOUSE_UP,this.§_-0§);
         SimpleButton(this.backBtn).removeEventListener(MouseEvent.MOUSE_UP,this.§_-0§);
         SimpleButton(this.§_-O§).removeEventListener(MouseEvent.MOUSE_UP,this.§_-Y§);
         SimpleButton(this.§_-0f§).removeEventListener(MouseEvent.MOUSE_UP,this.§_-50§);
         SimpleButton(this.§_-02§).removeEventListener(MouseEvent.MOUSE_UP,this.§with§);
      }
      
      private function §_-0§(param1:MouseEvent) : void
      {
         §_-0v§.§_-5q§(new §_-4o§(false));
      }
   }
}

