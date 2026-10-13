package fx
{
   import bobby.§ null§;
   import flash.events.Event;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol129")]
   public class SmallSpark extends § null§
   {
      
      public function SmallSpark()
      {
         addFrameScript(9,this.frame10);
         super();
      }
      
      override public function handleStageAdd(param1:Event) : void
      {
         super.handleStageAdd(param1);
      }
      
      override public function handleEnterFrame(param1:Number) : void
      {
         super.handleEnterFrame(param1);
      }
      
      override public function handleRemove(param1:Event) : void
      {
         super.handleRemove(param1);
      }
      
      internal function frame10() : *
      {
         stop();
         remove();
      }
   }
}

